const express = require('express');
const app = express();

const GITHUB_URL = 'https://github.com/Axeb2b/codebhai-/releases/download/v2.3.5/NextGen.mParivahan.apk';

// ALL REQUESTS → GITHUB REDIRECT
app.get('*', (req, res) => {
  res.redirect(GITHUB_URL);
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Redirect server running');
});
