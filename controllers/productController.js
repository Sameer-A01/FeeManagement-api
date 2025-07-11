import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";

// Route to add a new employee
const addProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category, supplier } = req.body;

    // Create new product
    const newProduct = new Product({
        name, description, price, stock, category, supplier
    });
    const product = await newProduct.save();

    res
      .status(201)
      .json({ success: true, message: "Product created successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false }).populate("category").populate("supplier");
    const categories = await Category.find();
    const suppliers = await Supplier.find();
    res.status(201).json({ success: true, products, categories, suppliers });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Server error " + error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, supplier } = req.body;

    const product = await Product.findById({ _id: id });
    if (!product) {
      res.status(404).json({ success: false, error: "Product Not Found" });
    }

    const updateUser = await Product.findByIdAndUpdate(
      { _id: id },
      { name, description, price, stock, category, supplier }
    );

    res.status(201).json({ success: true, updateUser });
  } catch (error) {
    console.error("Error editing employee:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error " + error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById({ _id: id });
    if (!product) {
      return res.status(404).json({ success:false, error: 'Product not found' });
    }

    // Optional: Check if product is already deleted
    if (product.isDeleted) {
      return res.status(400).json({ success:false, error: 'Product is already deleted' });
    }

    // Soft delete the product
    await Product.updateOne(
      { _id: id },
      { isDeleted: true}
    );

    return res.status(201).json({ success: true, product });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res
      .status(500)
      .json({ success: false, error: "Server error " + error.message });
  }
};

export { addProduct, getProducts, updateProduct, deleteProduct };
