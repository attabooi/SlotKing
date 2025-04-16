import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();
const db = admin.firestore();

const PORTONE_API_KEY = functions.config().portone.key;
const PORTONE_API_SECRET = functions.config().portone.secret;

export const verifyPayment = functions.https.onRequest(async (req, res): Promise<void> => {
  const { imp_uid, uid } = req.body;

  try {
    const tokenRes = await axios.post<{ response: { access_token: string } }>(
      "https://api.iamport.kr/users/getToken",
      {
        imp_key: PORTONE_API_KEY,
        imp_secret: PORTONE_API_SECRET,
      }
    );
    const accessToken = tokenRes.data.response.access_token;

    const paymentRes = await axios.get<{ response: any }>(
      `https://api.iamport.kr/payments/${imp_uid}`,
      {
        headers: { Authorization: accessToken },
      }
    );
    const payment = paymentRes.data.response;

    const isValid =
      payment.status === "paid" &&
      payment.amount === 5000 &&
      payment.name === "SlotKing Premium";

    if (!isValid) {
      res.status(400).send({
        success: false,
        reason: "Invalid payment or amount mismatch",
      });
      return;
    }

    await db.collection("users").doc(uid).set(
      {
        isPremium: true,
        premiumSince: new Date().toISOString(),
        paymentId: imp_uid,
      },
      { merge: true }
    );

    res.send({ success: true });
  } catch (err: any) {
    console.error("Verification error:", err.message);
    res.status(500).send({ success: false, error: err.message });
  }
});
