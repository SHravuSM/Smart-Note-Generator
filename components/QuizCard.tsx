import React, { useState } from 'react';

const QuizCard = ({ question, questionNumber }) => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const handleOptionSelect = (option) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);
    };

    const getOptionClass = (option) => {
        if (!isAnswered) {
            return "border-gray-300 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-700";
        }
        if (option === question.answer) {
            return "border-green-500 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300";
        }
        if (option === selectedOption) {
            return "border-red-500 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300";
        }
        return "border-gray-300 dark:border-gray-600";
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 transition-all duration-300">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-4">
                {questionNumber}. {question.question}
            </h3>
            <div className="space-y-3">
                {question.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleOptionSelect(option)}
                        disabled={isAnswered}
                        className={`w-full text-left p-3 border rounded-md transition-colors duration-200 ${getOptionClass(option)}`}
                    >
                        {option}
                    </button>
                ))}
            </div>
            {isAnswered && (
                <div className="mt-4 p-3 rounded-md bg-gray-100 dark:bg-gray-700/50 text-sm">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {selectedOption === question.answer ? "Correct! 🎉" : "Not quite."}
                    </p>
                    {selectedOption !== question.answer && (
                        <p className="text-gray-600 dark:text-gray-400">The correct answer is: <span className="font-bold text-green-600 dark:text-green-400">{question.answer}</span></p>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuizCard;