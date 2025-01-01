import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncError } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export const register = catchAsyncError(async (req, resizeBy, next) => {
    try {
        const { name, email, phone, password, verificationMethod } = req.body;

        if (!name || !email || !phone || !password || !verificationMethod) {
            return next(new ErrorHandler("Please fill in all fields", 400));
        }

        function validatePhoneNumber(phone) {
            // const phoneRegex = /^(\+91\d{10}|\+1\d{10}|\+977\d{10}|\+92\d{10})$/; //To validate phone numbers from multiple countries, you can use a more comprehensive regular expression that covers the formats for India, America, Nepal, and Pakistan.

            const phoneRegex = /^\+91\d{10}$/; // To validate an Indian phone number.
            return phoneRegex.test(phone);
        }

        if (!validatePhoneNumber(phone)) {
            return next(new ErrorHandler("Please enter a valid phone number", 400));
        }

        const existingUser = await User.findOne({
            $or: [
                {
                    email,
                    accountVerified: true,
                },
                {
                    phone,
                    accountVerified: true,
                },
            ],
        });

        if (existingUser) {
            return next(
                new ErrorHandler(
                    "User with this email or phone number is already registered",
                    400
                )
            );
        }

        const registrationAttemptsByUser = await User.find({
            $or: [
                {
                    email,
                    accountVerified: false,
                },
                {
                    phone,
                    accountVerified: false,
                },
            ],
        });

        if (registrationAttemptsByUser.length >= 3) {
            return next(
                new ErrorHandler(
                    "You have exceeded the maximum number of registration attempts (3). Please try again after an hour.",
                    400 //400 bad request
                )
            );
        }

        const userData = {
            name,
            email,
            phone,
            password,
        };

        const user = await User.create(userData);
        const verificationCode = await user.generateVerificationCode();
        await user.save();
        sendVerificationCode(verificationMethod, verificationCode, email, phone);
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        next(error);
    }
});

async function sendVerificationCode(
    verificationMethod,
    verificationCode,
    email,
    phone
) {
    try {
        if (verificationMethod === "email") {
          const message = generateEmailTemplate(verificationCode);
          sendEmail({ email, subject: "Your Verification Code", message });
        } else if (verificationMethod === "phone") {
          // Send verification code to user's phone number
          // You can use a third-party service like Twilio to send SMS
          const verificationCodeWithSpace = verificationCode
            .toString()
            .split("")
            .join(" ");
          await client.calls.create({
            twiml: `<Response>
    <Say voice="alice" language="en-US">
      Hello! Thank you for choosing our service. 
      Your secure verification code is ${verificationCode}. 

      I'll repeat that one more time.
      Your verification code is ${verificationCode}.
      Please enter this code on the verification page.
      For your security, never share this code with anyone.
      Thank you and have a great day!
    </Say>
  </Response>`,
            from: process.env.TWILIO_PHONE,
            to: phone,
          });
        } else {
          throw new ErrorHandler("Invalid verification method", 400);
        }
    } catch (error) {
        throw new ErrorHandler("Failed to send verification code", 500);
    }
}

function generateEmailTemplate(verificationCode) {
    return `
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #ddd; padding: 20px;">
        <div style="background-color: #4CAF50; color: white; padding: 10px 0; text-align: center;">
          <h1>Verification Code</h1>
        </div>
        <div style="margin: 20px 0;">
          <p>Dear User,</p>
          <p>Your verification code is:</p>
          <h2 style="color: #4CAF50;">${verificationCode}</h2>
          <p>Please use this code to complete your registration.</p>
        </div>
        <div style="text-align: center; color: #777; font-size: 12px; margin-top: 20px;">
          <p>If you did not request this code, please ignore this email.</p>
        </div>
      </div>
    </div>
  `;
}

