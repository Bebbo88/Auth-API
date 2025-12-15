class AppErrors extends Error {
  constructor() {
    super();
  }

  create(message, statusCode, statusText) {
    this.message = message;
    this.statusText = statusText;
    this.statusCode = statusCode;
    return this;
  }
}

module.exports = new AppErrors();
