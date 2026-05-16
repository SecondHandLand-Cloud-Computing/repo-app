import { ProductService } from "../services/product.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";

export const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = {
    id: req.user?.sub,
    role: req.user?.role,
  };

  const result = await ProductService.getById(id, user);
  return res.status(200).json({
    message: "Get product successfully",
    data: result,
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, quantity } = req.body;
  const image = req.file;

  const user = {
    id: req.user?.sub,
    role: req.user?.role,
  };

  const result = await ProductService.create(
    user,
    category,
    name,
    description,
    Number(price),
    Number(quantity ?? 0),
    image
  );

  return res.status(201).json({
    message: "Product created successfully",
    data: result,
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const payload = req.body; // payload can include (categoryId, name, desc, price)
  const image = req.file;
  const { id } = req.params;
  const user = {
    id: req.user?.sub,
    role: req.user?.role,
  };

  const result = await ProductService.update(user, id, payload, image);

  return res.json({
    message: "Product updated successfully",
    data: result,
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await ProductService.delete(id);

  return res.status(200).json({ message: "Product deleted successfully" });
});

export const getListProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, category } = req.query; // type category is id !!!

  const user = {
    id: req.user?.sub,
    role: req.user?.role,
  };

  const result = await ProductService.getList(user, page, limit, search, category);

  return res.status(200).json({
    message: "Get list products successfully",
    data: result,
  });
});

export const getMyListProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const id = req.user.id;

  const result = await ProductService.getMyList(id, Number(page), Number(limit));

  return res.status(200).json({
    message: "Get my list products successfully",
    data: result,
  });
});
