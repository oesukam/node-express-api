
const requestAsyncHandler = (cb) => async (req, res, next) => {
  try {
    await cb(req, res);
  } catch (error) {
    next(error);
  }
};

export default requestAsyncHandler;
