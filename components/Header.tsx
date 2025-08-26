import React from 'react';

const Header = () => {
    return (
        <header className="bg-white dark:bg-gray-800 shadow-md">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl">📝</span>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Smart Notes Digitizer</h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">From messy notes → clear, searchable documents</p>
                </div>
            </div>
        </header>
    );
};

export default Header;
