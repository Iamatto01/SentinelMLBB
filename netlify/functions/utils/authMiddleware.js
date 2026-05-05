const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

async function verifyAuth(event) {
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload; // Contains email, name, picture, sub (user ID)
  } catch (error) {
    throw new Error('Invalid token');
  }
}

module.exports = {
  verifyAuth
};
