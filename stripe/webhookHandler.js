const supabase = require('../supabase/client');

// In a real implementation, you would require('stripe') here
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Handle Stripe webhook events
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 */
async function handleWebhook(request, response) {
  // In a real implementation, you would verify the webhook signature here
  // const sig = request.headers['stripe-signature'];
  // let event;
  //
  // try {
  //   event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  // } catch (err) {
  //   console.error(`Webhook signature verification failed.`, err.message);
  //   return response.status(400).send(`Webhook Error: ${err.message}`);
  // }
  
  // For demonstration purposes, we'll just log the event
  console.log('Webhook event received:', request.body);
  
  // Handle the event
  switch (request.body.type) {
    case 'checkout.session.completed':
      const session = request.body.data.object;
      
      // Get metadata from the session
      const playerId = session.metadata.player_id;
      const eventId = session.metadata.event_id;
      
      // Update the registration to mark as paid
      const { data, error } = await supabase
        .from('event_registrations')
        .update({ stripe_paid: true })
        .eq('player_id', playerId)
        .eq('event_id', eventId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating registration:', error);
        // In a real implementation, you might want to handle this differently
        // For example, by sending an alert to an admin
      }
      
      console.log(`Registration marked as paid for player ${playerId} in event ${eventId}`);
      break;
    
    // Handle other event types as needed
    default:
      console.log(`Unhandled event type ${request.body.type}`);
  }
  
  // Return a 200 response to acknowledge receipt of the event
  response.json({ received: true });
}

module.exports = { handleWebhook };
