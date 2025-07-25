import React from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-[hsl(var(--background))] border-t border-border py-6 px-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center">
          {/* Copyright only */}
          <div className="text-sm">
            <p className="text-foreground/70">
              © {currentYear} Pascal Watteel
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}