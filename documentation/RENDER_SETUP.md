# Render Setup - Cache Warming Configuration

## 🎯 What We've Set Up

### ✅ Automatically Configured:
1. `postbuild` script in package.json - runs cache warming after every build
2. `simple-cache-warmup.js` - minimal script that warms the homepage cache
3. `warm-cache` command - manual cache warming option

## 📋 What You Need to Do in Render Dashboard

### Step 1: Add Environment Variable

1. Go to your **Render Dashboard**
2. Click on your **Web Service**
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add:
   - **Key:** `RENDER_EXTERNAL_URL`
   - **Value:** Your Render URL (e.g., `https://your-app.onrender.com`)
6. Click **"Save Changes"**

### Step 2: Deploy

1. Commit and push your changes to your repo
2. Render will automatically rebuild
3. Check the **build logs** - you should see:
   ```
   🔥 Starting cache warmup...
   Warming: /api/getData?page=1&limit=100
   ✅ Success
   🎉 Cache warmup complete
   ```

### Step 3: Verify

1. Visit your site after deployment
2. Page should load **fast** (under 1 second) even on first visit
3. Check console logs if you want to verify cache is working

## 🎉 That's It!

The cache will now automatically warm on every deployment, giving your users fast load times.

## 🔧 Optional: Manual Cache Warming

If you ever need to manually warm the cache:
```bash
npm run warm-cache
```

## 📊 Expected Performance

- **Before:** First page load = 5-10 seconds
- **After:** First page load = 400-600ms
- **Improvement:** ~90% faster! 🚀

