#!/bin/bash

# Fix all layout files with the correct layout structure

layouts=(
  "src/app/admin/layout.tsx"
  "src/app/search/layout.tsx"
  "src/app/templates/layout.tsx"
  "src/app/favorites/layout.tsx"
  "src/app/shared-prompts/layout.tsx"
  "src/app/tags/layout.tsx"
  "src/app/profile/layout.tsx"
)

for layout in "${layouts[@]}"; do
  echo "Fixing $layout..."
  
  # Replace the old grid layout with the new flex layout
  sed -i '' 's|<div className="grid min-h-screen w-full md:grid-cols-\[196px_1fr\] lg:grid-cols-\[224px_1fr\] bg-background">|<div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">|' "$layout"
  
  # Fix the content wrapper
  sed -i '' 's|<div className="flex flex-col min-h-screen">|<div className="flex flex-col flex-1 overflow-hidden ml-[260px]">|' "$layout"
  
  # Fix main content area
  sed -i '' 's|<main id="main-content" className="flex flex-1 flex-col gap-6 p-6 lg:gap-8 lg:p-8 bg-background">|<main id="main-content" className="flex-1 overflow-y-auto bg-[hsl(var(--secondary))] p-6">|' "$layout"
  
  # Add container wrapper if not present
  if ! grep -q "max-w-\[1440px\] mx-auto" "$layout"; then
    sed -i '' '/<main id="main-content"/,/<\/main>/ {
      s|{children}|<div className="max-w-[1440px] mx-auto">\
            {children}\
          </div>|
    }' "$layout"
  fi
done

echo "All layouts fixed!"