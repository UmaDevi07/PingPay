# PingPay
# PingPay: Payment Soundbox, No Hardware Needed

**Live demo:** https://main.d1enb1o8sl37y5.amplifyapp.com/
**Demo video:** https://youtu.be/lRS3ou6kD1w?si=DPHwqG61I03S_Dev

PingPay turns any phone into a payment soundbox for small shopkeepers. When a customer pays, PingPay announces it out loud in Hindi or English, for example *"Divya Menon paid 1877 rupees via PhonePe."* No extra device, no monthly rental.

## The problem

Small shopkeepers in India rely on UPI soundbox devices to hear when a payment lands. The hardware costs money, needs charging, and comes with rental fees. Without one, they have to keep checking their phone during a rush, and payments get missed or wrongly confirmed.

## The solution

A mobile-first web app the shopkeeper keeps open on their phone:

- **Automatic announcements:** the app polls the backend every 3 seconds and speaks each new payment (payer, amount, UPI app) without anyone touching the screen.
- **Hindi / English** voice toggle and a mute button.
- **Live dashboard:** today's total collection, payment count, and a feed of recent payments with the UPI app used.
- **Persistent history:** payments are stored in DynamoDB, so they survive refreshes and are visible from any device.

## How the demo works

Real UPI integration is not possible in a hackathon, so the **Demo Controls** section has a *Simulate customer payment* button. It plays the role of the customer paying: it sends a payment to the backend, and the shopkeeper's screen (open on another device) announces it on its own.

In production, the same `POST /payment` endpoint would be called by a payment gateway webhook (for example Razorpay) instead of the demo button.

## Architecture

```
Shopkeeper phone / customer device
        |
        v
AWS Amplify Hosting  (React + Vite + Tailwind frontend)
        |  HTTPS
        v
Amazon API Gateway   (HTTP API)
        |
        v
AWS Lambda           (Python 3.12)
        |
        v
Amazon DynamoDB      (payments table)
```

| Endpoint | Purpose |
|---|---|
| `POST /payment` | Save a payment (`amount`, `payer`, `app`) |
| `GET /payments` | Return the 50 most recent payments |

All backend resources run in the AWS Asia Pacific (Hyderabad) region and scale to zero when idle.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, browser Web Speech API for voice
- **Backend:** AWS Lambda (Python), API Gateway, DynamoDB
- **Hosting:** AWS Amplify Hosting

## Repository layout

- `src/`: frontend app
- `backend/lambda_function.py`: Lambda handler for both endpoints

## Built by

Uma Devi. The frontend was scaffolded with Bolt.new and then wired to the AWS backend.

## What's next

- Real payment gateway webhook instead of the demo button
- Multiple shops with login (Cognito)
- Regional languages beyond Hindi and English
- Daily collection summary for the shopkeeper
