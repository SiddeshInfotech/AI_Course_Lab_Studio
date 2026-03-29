/**
 * Quick test to verify security routes are properly exported
 */

import securityRoutes from "./routes/securityRoutes.js";

console.log("✅ Security routes imported successfully");
console.log("Routes type:", typeof securityRoutes);
console.log("Router stack length:", securityRoutes.stack?.length || 0);

// Check if routes are registered
if (securityRoutes.stack && securityRoutes.stack.length > 0) {
  console.log("\n📋 Registered routes:");
  securityRoutes.stack.forEach((layer, idx) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(", ");
      console.log(`  ${idx + 1}. ${methods} ${layer.route.path}`);
    }
  });
} else {
  console.log("⚠️  No routes found!");
}

process.exit(0);
