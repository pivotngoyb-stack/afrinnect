Deno.serve(async (req) => {
  try {
    const vapidKey = Deno.env.get("VAPID_KEY");
    
    if (!vapidKey) {
      return Response.json(
        { error: 'VAPID_KEY not configured' },
        { status: 500 }
      );
    }

    // Return as object for consistency
    return Response.json({ vapid_key: vapidKey }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});