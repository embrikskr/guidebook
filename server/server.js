const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Guide = require('./models/Guide');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB tilkoblet'))
  .catch((err) => console.error('MongoDB tilkoblingsfeil:', err));

// Hent alle guider
app.get('/api/guides', async (req, res) => {
  try {
    const guides = await Guide.find();
    res.json(guides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lagre en ny guide
app.post('/api/guides', async (req, res) => {
  const guide = new Guide({
    title: req.body.title,
    content: req.body.content,
  });

  try {
    const newGuide = await guide.save();
    res.status(201).json(newGuide);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Oppdater en eksisterende guide
app.put('/api/guides/:id', async (req, res) => {
  try {
    const guide = await Guide.findById(req.params.id);
    if (!guide) {
      return res.status(404).json({ message: 'Guide ikke funnet' });
    }

    guide.title = req.body.title || guide.title;
    guide.content = req.body.content || guide.content;

    const updatedGuide = await guide.save();
    res.json(updatedGuide);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Slett en guide
app.delete('/api/guides/:id', async (req, res) => {
  try {
    const guide = await Guide.findById(req.params.id);
    if (!guide) {
      return res.status(404).json({ message: 'Guide ikke funnet' });
    }

    await guide.deleteOne();
    res.json({ message: 'Guide slettet' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/', (req, res) => res.send('Backend kjører!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server på port ${PORT}`));