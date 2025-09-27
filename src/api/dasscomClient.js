const { shell } = require("electron"); // add this at the top


async function ipPhoneApi(ip, param, oper = "query") {
  const controller = new Ab
}


//login
async function login(ip, username, password) {
  console.log("🚀 ~ login ~ login:", ip, username);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout

  try {
    const loginUrl = `http://${ip}/action/login?username=${username}&password=${password}`;
    console.log("🔗 Login URL:", loginUrl);

    let res = await fetch(loginUrl, {
      method: "POST", // Use POST method as per API documentation
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      mode: 'cors'
    });

    clearTimeout(timeoutId);
    console.log("🚀 ~ login ~ res (API):", res.status, res.statusText);

    if (res.ok) {
      // ✅ API login worked - parse response
      let loginData = {};
      try {
        const responseText = await res.text();
        if (responseText) {
          loginData = JSON.parse(responseText);
        }
        console.log("📄 Login response data:", loginData);
      } catch (parseError) {
        console.log("📄 Login response is not JSON or empty:", parseError.message);
      }

      return { ...loginData, ip, loginSuccess: true };
    } else {
      // ❌ API login failed → open normal web UI
      console.warn(`⚠️ Login endpoint failed (${res.status}), opening in browser...`);
      shell.openExternal(`http://${ip}`);
      return { openedBrowser: true };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("❌ Login request error:", error.message);

    // If request itself failed (timeout / network) → still open browser
    shell.openExternal(`http://${ip}`);
    return { openedBrowser: true };
  }
}

//Query version number
async function fetchSystemInfo(ip, token) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/infos.cgi?oper=query&param=version`;
   console.log("🔗 System info API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ fetchSystemInfo ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error("❌ System info fetch failed:", res.status, res.statusText);
     throw new Error(`System info fetch failed: ${res.status} ${res.statusText}`);
   }

   const responseText = await res.text();
   console.log("📄 System info raw response text:", responseText);

   let data;
   try {
     data = JSON.parse(responseText);
     console.log("📄 System info parsed response:", data);
   } catch (parseError) {
     console.error("❌ Failed to parse system info response as JSON:", parseError.message);
     console.log("📄 Response text that failed to parse:", responseText);
     // Return the raw text if JSON parsing fails
     return { rawResponse: responseText };
   }

   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('System info request timed out');
   }
   console.error("❌ System info fetch error:", error.message);
   throw error;
 }
}



// Query SVN version number
async function fetchSvnVersion(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/infos.cgi?oper=query&param=svn_version`;
   console.log("🔗 SVN version API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ fetchSvnVersion ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error("❌ SVN version fetch failed:", res.status, res.statusText);
     throw new Error(`SVN version fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("📄 SVN version response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('SVN version request timed out');
   }
   console.error("❌ SVN version fetch error:", error.message);
   throw error;
 }
}

// Get IP Address
async function fetchIpAddress(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/infos.cgi?oper=query&param=ipaddr`;
   console.log("🔗 IP address API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ fetchIpAddress ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error("❌ IP address fetch failed:", res.status, res.statusText);
     throw new Error(`IP address fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("📄 IP address response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('IP address request timed out');
   }
   console.error("❌ IP address fetch error:", error.message);
   throw error;
 }
}

//get account information
async function fetchAccountInfo(ip) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Use Basic Auth directly as per API documentation
    const authString = btoa('admin:admin');
    const headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(`http://${ip}/cgi-bin/infos.cgi?oper=query&param=account_infos`, {
      method: "GET",
      headers: headers,
      signal: controller.signal,
      mode: 'cors'
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Account info fetch failed: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Account info request timed out');
    }

    throw error;
  }
}


//get account information (parameter)



// get DNS

async function fetchDNS(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/infos.cgi?oper=query&amp;param=dns_inuse`;
   console.log("DNS API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ dns ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error(" DNS fetch failed:", res.status, res.statusText);
     throw new Error(`DNS fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("DNS response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('DNS request timed out');
   }
   console.error("fetch error:", error.message);
   throw error;
 }
}


//get gateway
async function fetchGetway(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/infos.cgi?oper=query&amp;param=gateway_inuse`;
   console.log("Gateway API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ gateway ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error(" gateway fetch failed:", res.status, res.statusText);
     throw new Error(`gateway fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("DNS response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('gateway timed out');
   }
   console.error("fetch error:", error.message);
   throw error;
 }
}


//get the mask
async function fetchNetMask(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/infos.cgi?oper=query&amp;param=netmask`;
   console.log("DNS API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ net mast ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error(" net mask fetch failed:", res.status, res.statusText);
     throw new Error(`net mask fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("net mask response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('net mask request timed out');
   }
   console.error("fetch error:", error.message);
   throw error;
 }
}

//get account status

async function fetchAccountStatus(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/infos.cgi?oper=query&amp;param=account_status`;
   console.log("account status API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ account status ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error(" account status fetch failed:", res.status, res.statusText);
     throw new Error(`account status fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("account status response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('account status request timed out');
   }
   console.error("fetch error:", error.message);
   throw error;
 }
}

// get call status
async function fetchCallStatus(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/infos.cgi?oper=query&amp;param=call_status`;
   console.log("call status API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ call status ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error(" call status fetch failed:", res.status, res.statusText);
     throw new Error(`call status fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("call status response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('call status request timed out');
   }
   console.error("fetch error:", error.message);
   throw error;
 }
}



//get all account information
async function fetchAllAcountInformation(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/infos.cgi?oper=query&amp;param=account_allinfos`;
   console.log("DNS API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ all account information ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error(" all account information fetch failed:", res.status, res.statusText);
     throw new Error(`all account information fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("all account information response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('all account information request timed out');
   }
   console.error("fetch error:", error.message);
   throw error;
 }
}

//restart
async function fetchRestart(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/actions.cgi?oper=restart&amp;param=system`;

   
   console.log("DNS API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ restart ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error(" restart fetch failed:", res.status, res.statusText);
     throw new Error(`restart fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("restart response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('restartrequest timed out');
   }
   console.error("fetch error:", error.message);
   throw error;
 }
}


//reset
async function fetchReset(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/actions.cgi?oper=reset`;
   
   console.log("reset API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ reset ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error(" reset fetch failed:", res.status, res.statusText);
     throw new Error(`reset fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("reset response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('restartrequest timed out');
   }
   console.error("fetch error:", error.message);
   throw error;
 }
}
//call
async function fetchCall(ip) {
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

   // Use Basic Auth directly as per API documentation
   const authString = btoa('admin:admin');
   const headers = {
     'Authorization': `Basic ${authString}`,
     'Content-Type': 'application/json',
   };

   const apiUrl = `http://${ip}/cgi-bin/actions.cgi?oper=call_out&amp;param=tar_num1234`;

   
   console.log("DNS API URL:", apiUrl);

   const res = await fetch(apiUrl, {
     method: "GET",
     headers: headers,
     signal: controller.signal,
     mode: 'cors'
   });

   clearTimeout(timeoutId);
   console.log("🚀 ~ call ~ res:", res.status, res.statusText);

   if (!res.ok) {
     console.error(" call fetch failed:", res.status, res.statusText);
     throw new Error(`call fetch failed: ${res.status} ${res.statusText}`);
   }

   const data = await res.json();
   console.log("call response:", data);
   return data;
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('call request timed out');
   }
   console.error("fetch error:", error.message);
   throw error;
 }
}



//speaker
// Login first and get token
const deviceTokens = {}; // store per-IP token

async function speakerLogin(ip, username, password) {
  const url = `http://${ip}/api/login`;
  console.log(`Attempting speaker login to ${url} with username: ${username}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  console.log(`Login response status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`Login failed response body: ${text}`);
    throw new Error(`Login failed: ${res.status} ${res.statusText} | ${text}`);
  }

  const data = await res.json();
  console.log("Login response data:", data);
  const token = data.data?.token;
  if (!token) throw new Error("Login succeeded but no token returned");

  deviceTokens[ip] = token; // store token for this IP
  console.log(`Login successful, token stored for ${ip}: ${token.substring(0, 20)}...`);
  return token;
}

async function speakerApi(ip, token, endpoint, method = "GET", body = null) {
  const url = `http://${ip}${endpoint}`;
  console.log(`Making speaker API call to ${url}${token ? ` with token: ${token.substring(0, 20)}...` : ' without token'}`);

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (token) {
    headers["Authorization"] = token;
    console.log(`Authorization header set to: ${token.substring(0, 20)}...`);
  }

  console.log("Full headers:", headers);

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  console.log(`API response status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`API failed response body: ${text}`);
    throw new Error(`API request failed (${endpoint}): ${res.status} ${res.statusText} | ${text}`);
  }

  const responseData = await res.json();
  console.log("API response data:", responseData);
  return responseData;
}


module.exports = {speakerApi, speakerLogin,login, fetchSystemInfo, fetchSvnVersion, fetchIpAddress, fetchAccountInfo, fetchDNS,  fetchGetway, fetchNetMask, fetchAccountStatus, fetchCallStatus,  fetchAllAcountInformation, fetchRestart, fetchReset, fetchCall};
