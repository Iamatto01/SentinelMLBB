import Groq from 'groq-sdk';

// Initialize the Groq client
// Make sure GROQ_API_KEY is set in your .env.local
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export default groq;
