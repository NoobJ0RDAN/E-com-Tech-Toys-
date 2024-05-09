const express = require("express");
const {
  createProduct,
  fetchAllProducts,
  fetchProductById,
  updateProduct,
} = require("../controllers/Product");
const router = express.Router();

router
  .post("/", createProduct)
  .get("/:id", fetchProductById)
  .patch("/:id", updateProduct)
  .get("/", fetchAllProducts);
exports.router = router;
