import dotenv from 'dotenv';
dotenv.config();
import bcrypt from "bcrypt";
import User from "./models/User.js";
import connectToMongoDB from "./db/connectToMongoDB.js";

// run this file for the first time to insert a record for admin 
// to run this file move to terminal and run
// node --env-file=env seed.js

const register = async () => {
  try {
      connectToMongoDB()
      const hashedPassword = await bcrypt.hash("admin", 10);
      const newUser = new User({
        name: "admin",
        email: "admin@gmail.com",
        password: hashedPassword,
        address: "KBL",
        role: 'admin'
      });
      await newUser.save();
      console.log("admin created")
    } catch (err) {
      console.log(err);
    }
  };
  
  register();