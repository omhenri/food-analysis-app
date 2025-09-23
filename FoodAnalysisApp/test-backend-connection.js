// Simple script to test backend connection
const testBackendConnection = async () => {
  const backendUrl = 'http://localhost:8000/api';
  
  console.log('Testing backend connection...');
  console.log('Backend URL:', backendUrl);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${backendUrl}/health`);
    console.log('Health check status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health check response:', healthData);
    } else {
      console.log('Health check failed:', healthResponse.statusText);
    }
  } catch (error) {
    console.error('Health check error:', error.message);
  }
  
  try {
    // Test batch analyze endpoint (using analyze-foods for multiple foods)
    console.log('\n2. Testing batch analyze endpoint...');
    const testFoods = {
      foods: [
        {
          food_name: 'Apple',
          meal_type: 'snack',
          id: 'test-apple-1'
        },
        {
          food_name: 'Chicken Breast',
          meal_type: 'lunch',
          id: 'test-chicken-1'
        }
      ]
    };

    const analyzeResponse = await fetch(`${backendUrl}/analyze-foods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testFoods)
    });

    console.log('Batch analyze request status:', analyzeResponse.status);

    if (analyzeResponse.ok) {
      const analyzeData = await analyzeResponse.json();
      console.log('Batch analyze response:', JSON.stringify(analyzeData, null, 2));
    } else {
      const errorText = await analyzeResponse.text();
      console.log('Batch analyze request failed:', errorText);
    }
  } catch (error) {
    console.error('Analyze request error:', error.message);
  }
};

// Run the test
testBackendConnection();