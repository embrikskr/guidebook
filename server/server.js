const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB tilkoblet'))
  .catch((err) => console.error('MongoDB tilkoblingsfeil:', err));

app.get('/', (req, res) => res.send('Backend kjører!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server på port ${PORT}`));