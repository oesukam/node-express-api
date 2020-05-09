import app from './app';

const { PORT = 3000 } = process.env;

// finally, let's start our server...
const server = app.listen(PORT, () =>{
  console.log(`Listening on port ${server.address().port}`);
});

export default server;
