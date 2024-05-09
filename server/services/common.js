const passport = require("passport");

exports.isAuth = (req, res, done) => {
  return passport.authenticate("jwt");
};

exports.sanitizeUser = (user) => {
  return { id: user.id, role: user.role };
};
exports.cookieExtractor = function (req) {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies["jwt"];
  }
  // //TODO : this is temporary token for testing without cookie
  //token =
  //"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2MGNmZjdiZDEwNGU0MGQ4MzRhNjdmNyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxMjEyOTEwM30._5LfF5ov0Zf_vFNleD2049MK-vBKGrJH35QT-iToXxM";
  return token;
};
