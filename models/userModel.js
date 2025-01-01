import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    // minlength: 3,
    // maxlength: 50
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid email address",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "password must be at least 8 characters long."],
    maxlength: [32, "password cannot be more than 32 characters long."],
    select: false,
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    match: [
      /^\+?([0-9]{1,3})?[-. ]?([0-9]{1,3})[-. ]?([0-9]{1,4})[-. ]?([0-9]{1,4})$/,
      "Please enter a valid phone number",
    ],
  },
  accountVerified: {
    type: Boolean,
    default: false,
  },
  verificationCode: Number,
  verificationCodeExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
})

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
}

userSchema.methods.generateVerificationCode = function () {
  function generateRandomFiveDigitNumber() {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainigDigit = Math.floor(Math.random() * 10000).toString().padStart(4, 0);
    return parseInt(firstDigit + remainigDigit);
  }

  const verificationCode = generateRandomFiveDigitNumber()
  this.verificationCode = verificationCode;
  this.verificationCodeExpire = new Date(Date.now() + 300000); // 5 minutes

  return verificationCode;
}

export const User = mongoose.model('User', userSchema);