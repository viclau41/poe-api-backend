export const config = {
  runtime: "edge"
};

const keyMap = {
  "529": "green",
  "315": "red",
  "412": "blue",
  "61883889": "phone"
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === "POST") {
    try {
      const origin = request.headers.get("origin");
      const apiKey = request.headers.get("x-api-key");
      
      const validOrigin = origin && origin.includes("victorlau.myqnapcloud.com");
      const validKey = keyMap[apiKey] !== undefined;
      
      if (!validOrigin && !validKey) {
        return new Response("Forbidden", { status: 403 });
      }
      
      const requestData = await request.json();
      
      let message = "";
      let model = "";
      
      if (requestData.messages) {
        message = requestData.messages[0] ? requestData.messages[0].content : "";
        model = requestData.bot_name || "";
      } else {
        message = requestData.message || "";
        model = requestData.model || "";
      }

      if (!message) { 
        throw new Error("Missing message"); 
      }

      const poeToken = process.env.POE_TOKEN;
      if (!poeToken) { 
        throw new Error("POE_TOKEN missing"); 
      }

      const payloadForPoe = {
        model: model || "Claude-3-Haiku-20240307",
        messages: [{ role: "user", content: message }],
        stream: false
      };

      const apiResponse = await fetch("https://api.poe.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + poeToken,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payloadForPoe)
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error("Poe API failed: " + apiResponse.status);
      }

      const data = await apiResponse.json();
      const responseText = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "No response";
      
      return new Response(JSON.stringify({ 
        text: responseText 
      }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        text: "Error: " + error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
  
  return new Response("Method not allowed", { 
    status: 405, 
    headers: corsHeaders 
  });
}
