export default (state = [], action) => {
  switch (action.type) {
    case "FILLER_ACTION":
      return action.payload;
    default:
      return state;
  }
};
