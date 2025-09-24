#!/usr/bin/env python3
"""
Script to demonstrate switching from OpenAI to OpenRouter
Run this to test OpenRouter integration
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_openrouter_connection():
    """Test OpenRouter API connection"""
    try:
        import openai

        # Check for OpenRouter key first, then OpenAI
        api_key = os.getenv('OPENROUTER_API_KEY') or os.getenv('OPENAI_API_KEY')

        if not api_key:
            print("❌ No API key found (OPENROUTER_API_KEY or OPENAI_API_KEY)")
            print("   Get your OpenRouter API key from: https://openrouter.ai/")
            print("   Or use your existing OpenAI API key")
            return False

        # Configure OpenAI client
        from openai import OpenAI

        # Use OpenRouter if we have their key, otherwise use OpenAI
        if os.getenv('OPENROUTER_API_KEY'):
            client = OpenAI(
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1"
            )
            model = "anthropic/claude-3-haiku"  # Cost-effective OpenRouter model
            provider = "OpenRouter"
        else:
            client = OpenAI(api_key=api_key)
            model = "gpt-4"
            provider = "OpenAI"

        print(f"🔗 Testing {provider} connection...")

        # Test with a simple request
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": "What are the main ingredients in a typical grilled chicken breast? List 3-5 ingredients."
                }
            ],
            max_tokens=100,
            temperature=0.3
        )

        result = response.choices[0].message.content.strip()
        print("✅ API connection successful!")
        print(f"📝 Using: {provider} with {model}")
        print(f"📝 Response: {result}")
        return True

    except Exception as e:
        print(f"❌ API test failed: {str(e)}")
        return False

def show_cost_comparison():
    """Show cost comparison between providers"""
    print("\n💰 Cost Comparison (per 1K tokens):")
    print("=" * 50)
    print("OpenAI GPT-4:              $0.03 input, $0.06 output")
    print("OpenRouter GPT-4:          $0.03 input, $0.06 output")
    print("OpenRouter Claude-3-Haiku: $0.00025 input, $0.00125 output")
    print("OpenRouter GPT-4o-mini:    $0.00015 input, $0.0006 output")
    print("\n💡 Potential savings: 95-99% with OpenRouter!")
    print("💡 Recommended: Claude-3-Haiku for best quality/cost balance")

def show_migration_steps():
    """Show steps to migrate to OpenRouter"""
    print("\n🚀 Migration Steps:")
    print("=" * 30)
    print("1. Get OpenRouter API key from https://openrouter.ai/")
    print("2. Add to environment: OPENROUTER_API_KEY=your-key-here")
    print("3. Code automatically detects and uses OpenRouter")
    print("4. Test with: python switch_to_openrouter.py")
    print("5. Deploy to production - no code changes needed!")

if __name__ == "__main__":
    print("🔄 OpenRouter Integration Test")
    print("=" * 40)

    # Test connection
    success = test_openrouter_connection()

    if success:
        show_cost_comparison()
        show_migration_steps()
        print("\n✅ OpenRouter is ready for food analysis!")
        print("   Estimated cost savings: 95-99%")
    else:
        print("\n⚠️  OpenRouter setup needed. Follow the migration steps above.")
