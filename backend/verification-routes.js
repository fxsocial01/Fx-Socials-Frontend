import crypto from 'crypto';

// Factory for the Fx Socials verification API. Keep provider keys on Render only.
export function registerVerificationRoutes(app, { q, auth, paystackSecret, termiiKey }) {
  app.post('/api/paystack/webhook', async (req, res) => {
    try {
      const signature = req.headers['x-paystack-signature'];
      const raw = req.rawBody;
      if (!signature || !raw || !paystackSecret) return res.sendStatus(401);
      const expected = crypto.createHmac('sha512', paystackSecret).update(raw).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(String(signature)), Buffer.from(expected))) return res.sendStatus(401);
      const event = req.body;
      if (event?.event === 'charge.success' && event.data?.reference) {
        const reference = String(event.data.reference);
        const amount = Number(event.data.amount || 0);
        const payment = (await q('SELECT * FROM payments WHERE reference=$1',[reference])).rows[0];
        if (payment && payment.status !== 'success' && amount === Number(payment.requested_kobo)) {
          const c = await q('UPDATE payments SET status=$1,charged_kobo=$2 WHERE reference=$3 AND status<>$1',["success",amount,reference]);
          if (c.rowCount) await q('UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2',[amount,payment.user_id]);
        }
      }
      return res.sendStatus(200);
    } catch (e) { return res.sendStatus(500); }
  });

  app.post('/api/verification/send', auth, async (req, res) => {
    const phone = String(req.body?.phone || '').replace(/\D/g,'');
    if (!/^\d{10,15}$/.test(phone)) return res.status(400).json({error:'Enter a valid international phone number.'});
    if (!termiiKey) return res.status(503).json({error:'OTP provider is not configured yet.'});
    try {
      const r = await fetch('https://api.ng.termii.com/api/sms/otp/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({api_key:termiiKey,pin_type:'NUMERIC',phone_number:phone,pin_attempts:3,pin_time_to_live:10,channel:'generic'})
      });
      const d = await r.json().catch(()=>({}));
      if (!r.ok || !d.user_id || !d.pin_id) return res.status(502).json({error:d.message||'Could not send verification code.'});
      return res.json({ok:true,pinId:d.pin_id,userId:d.user_id,message:'Verification code sent.'});
    } catch (e) { return res.status(502).json({error:'OTP provider request failed.'}); }
  });

  app.post('/api/verification/check', auth, async (req, res) => {
    const pinId = String(req.body?.pinId || '');
    const pin = String(req.body?.pin || '').trim();
    const phone = String(req.body?.phone || '').replace(/\D/g,'');
    if (!pinId || !/^\d{4,8}$/.test(pin) || !phone) return res.status(400).json({error:'Enter the verification code.'});
    if (!termiiKey) return res.status(503).json({error:'OTP provider is not configured yet.'});
    try {
      const r = await fetch('https://api.ng.termii.com/api/sms/otp/verify', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({api_key:termiiKey,pin_id:pinId,pin})
      });
      const d = await r.json().catch(()=>({}));
      if (!r.ok || String(d.verified).toLowerCase() !== 'true') return res.status(400).json({error:d.message||'Invalid or expired verification code.'});
      return res.json({ok:true,verified:true,phone,message:'Phone number verified successfully.'});
    } catch (e) { return res.status(502).json({error:'OTP verification request failed.'}); }
  });
}
