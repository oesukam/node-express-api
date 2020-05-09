
const requestAsyncHandler = (cb) => async (req, res, next, other) => {
  try {
    await cb(req, res, next, other);
  } catch (error) {
    next(error);
  }
};

export default requestAsyncHandler;
