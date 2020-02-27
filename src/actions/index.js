export const fillerAction = foo => async dispatch => {
  dispatch({
    type: "FILLER_ACTION",
    payload: true
  });
};
