const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Guide = require('./models/Guide'); // Importer Guide-modellen

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB tilkoblet'))
  .catch((err) => console.error('MongoDB tilkoblingsfeil:', err));

// Rute for å hente alle guider
app.get('/api/guides', async (req, res) => {
  try {
    const guides = await Guide.find();
    res.json(guides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rute for å lagre en ny guide
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

app.get('/', (req, res) => res.send('Backend kjører!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server på port ${PORT}`));