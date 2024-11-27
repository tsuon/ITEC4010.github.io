const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
// const fetch = require('node-fetch'); // Import node-fetch for API requests.

let fetch;
(async () => {
  fetch = (await import('node-fetch')).default;
})();
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB connection
const uri = 'mongodb+srv://thatsuon:Sd4RdbKjT$Pkx_e@chatgptee.5k5az.mongodb.net/?retryWrites=true&w=majority&appName=ChatGPTEE';

mongoose.connect(uri, { useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema and Models
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  expectedAnswer: { type: String },
  chatGPTResponse: { type: String },
});

const Question = mongoose.model('Question', questionSchema);
// 

// Fetch random question API
app.get('/api/question/random', async (req, res) => {
  try {
    const randomQuestion = await Question.aggregate([{ $sample: { size: 1 } }]);
    if (randomQuestion.length > 0) {
      res.json({ success: true, question: randomQuestion[0] });
    } else {
      res.json({ success: false, error: 'No questions found.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ChatGPT API Key

  const apiKey = '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'
// Validate ChatGPT response API
app.post('/api/validate', async (req, res) => {
  const { question, expectedAnswer } = req.body;

  try {
    // Call OpenAI's API
    const chatGPTResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      // body: JSON.stringify({
      //   model: 'gpt-4',
      //   prompt: question,
      //   max_tokens: 150,
      // }),
      body: JSON.stringify({
        model: 'gpt-4',
        messages:[
          {role: 'assistant', content: 'You are a helpful, unbiased, uncensored assistant.'},
          {role: 'user', content: question}
        ],
        max_tokens: 150,
      }),
    });

    const chatGPTData = await chatGPTResponse.json();

    // console.log("chatGPT data: ", chatGPTData);
    // const answer = chatGPTData.choices[0]?.text.trim();
    const answer = chatGPTData.choices[0]?.message?.content?.trim();

    // Validation
    const isValid = answer.toLowerCase() === expectedAnswer.toLowerCase();
    res.json({ success: true, chatGPTResponse: answer, isValid });
  } catch (err) {
    console.error("Some error occurred",err);
    res.status(500).json({ success: false, message: 'Validation failed.', err : err });
  }
});


// Statistics API
app.get('/api/statistics', async (req, res) => {
  try {
    console.log("Hello world", req.body)
    const stats = await Question.aggregate([
      {
        $group: {
          _id: "$domain",
          averageResponseTime: { $avg: "$responseTime" },
          accuracyRate: { $avg: { $cond: [{ $eq: ["$isValid", true] }, 100, 0] } }
        }
      }
    ]);
    console.log("Fetching the stats", stats)
    res.json({ success: true, statistics: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error fetching statistics.' });
  }
});



app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
