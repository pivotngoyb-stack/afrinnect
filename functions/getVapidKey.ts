Deno.serve(async (req) => {
  try {
    const vapidKey = Deno.env.get("VAPID_KEY");
    
    if (!vapidKey) {
      return Response.json(
        { error: 'VAPID_KEY not configured' },
        { status: 500 }
      );
    }

    return Response.json(vapidKey, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});