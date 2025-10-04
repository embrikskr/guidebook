const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const Guide = require('./models/Guide');
const User = require('./models/User');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB tilkoblet'))
  .catch((err) => console.error('MongoDB tilkoblingsfeil:', err));

const authMiddleware = (req, res, next) => {
  const authorizationHeader = req.headers.authorization || '';
  const token = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'Innlogging kreves' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Ugyldig eller utløpt token' });
  }
};

const sanitizeSections = (sections) => {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .map((section) => String(section).trim())
    .filter((section) => section.length > 0);
};

const generateUniqueSlug = async () => {
  let slug;
  let existingGuide = true;

  while (existingGuide) {
    slug = crypto.randomBytes(4).toString('hex');
    existingGuide = await Guide.exists({ slug });
  }

  return slug;
};

const buildGuideResponse = (guide) => ({
  _id: guide._id,
  title: guide.title,
  sections: guide.sections,
  slug: guide.slug,
  createdAt: guide.createdAt,
  updatedAt: guide.updatedAt,
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Navn, e-post og passord er påkrevd' });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'E-postadressen er allerede registrert' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Feil ved registrering:', error);
    return res.status(500).json({ message: 'Kunne ikke registrere bruker' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'E-post og passord er påkrevd' });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Feil e-post eller passord' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Feil e-post eller passord' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Feil ved innlogging:', error);
    return res.status(500).json({ message: 'Kunne ikke logge inn' });
  }
});

app.get('/api/guides', authMiddleware, async (req, res) => {
  try {
    const guides = await Guide.find({ owner: req.userId }).sort({ updatedAt: -1 });
    return res.json(guides.map((guide) => buildGuideResponse(guide)));
  } catch (error) {
    console.error('Feil ved henting av guider:', error);
    return res.status(500).json({ message: 'Kunne ikke hente guider' });
  }
});

app.post('/api/guides', authMiddleware, async (req, res) => {
  const { title, sections } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Tittel er påkrevd' });
  }

  const cleanedSections = sanitizeSections(sections);

  if (cleanedSections.length === 0) {
    return res.status(400).json({ message: 'Legg til minst én seksjon i guiden' });
  }

  try {
    const slug = await generateUniqueSlug();
    const guide = await Guide.create({
      title,
      sections: cleanedSections,
      slug,
      owner: req.userId,
    });

    return res.status(201).json(buildGuideResponse(guide));
  } catch (error) {
    console.error('Feil ved opprettelse av guide:', error);
    return res.status(500).json({ message: 'Kunne ikke opprette guide' });
  }
});

app.put('/api/guides/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, sections } = req.body;

  try {
    const guide = await Guide.findOne({ _id: id, owner: req.userId });

    if (!guide) {
      return res.status(404).json({ message: 'Guide ikke funnet' });
    }

    if (title) {
      guide.title = title;
    }

    if (sections) {
      guide.sections = sanitizeSections(sections);
    }

    const updatedGuide = await guide.save();
    return res.json(buildGuideResponse(updatedGuide));
  } catch (error) {
    console.error('Feil ved oppdatering av guide:', error);
    return res.status(500).json({ message: 'Kunne ikke oppdatere guide' });
  }
});

app.delete('/api/guides/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const guide = await Guide.findOne({ _id: id, owner: req.userId });

    if (!guide) {
      return res.status(404).json({ message: 'Guide ikke funnet' });
    }

    await guide.deleteOne();
    return res.json({ message: 'Guide slettet' });
  } catch (error) {
    console.error('Feil ved sletting av guide:', error);
    return res.status(500).json({ message: 'Kunne ikke slette guide' });
  }
});

app.get('/api/guides/share/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const guide = await Guide.findOne({ slug }).populate('owner', 'name');

    if (!guide) {
      return res.status(404).json({ message: 'Guide ikke funnet' });
    }

    return res.json({
      title: guide.title,
      sections: guide.sections,
      slug: guide.slug,
      hostName: guide.owner?.name,
      updatedAt: guide.updatedAt,
    });
  } catch (error) {
    console.error('Feil ved deling av guide:', error);
    return res.status(500).json({ message: 'Kunne ikke hente delt guide' });
  }
});

app.get('/', (req, res) => res.send('Backend kjører!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server på port ${PORT}`));
