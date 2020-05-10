
const requestAsyncHandler = (cb) => async (req, res, next, other) => {
  await cb(req, res, next, other);
};

export default requestAsyncHandler;
