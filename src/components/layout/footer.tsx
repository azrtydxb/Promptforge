import React from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6 px-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center">
          {/* Copyright only */}
          <div className="text-sm">
            <p className="text-gray-800 dark:text-gray-200 font-bold">
              © {currentYear} Pascal Watteel
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}