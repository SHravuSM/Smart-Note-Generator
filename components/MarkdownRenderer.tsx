import React from 'react';

const MarkdownRenderer = ({ content }) => {
    const renderContent = () => {
        // Process block-level elements first, assuming they are separated by double newlines
        let htmlContent = content
            .split('\n\n')
            .map(block => {
                const trimmedBlock = block.trim();
                if (!trimmedBlock) return '';

                // Headings
                if (trimmedBlock.startsWith('## ')) return `<h2 class="text-2xl font-bold mt-6 mb-3">${trimmedBlock.substring(3)}</h2>`;
                if (trimmedBlock.startsWith('### ')) return `<h3 class="text-xl font-semibold mt-4 mb-2">${trimmedBlock.substring(4)}</h3>`;

                const lines = trimmedBlock.split('\n');

                // Check for Unordered List (all lines must start with * or -)
                if (lines.every(line => line.trim().startsWith('* ') || line.trim().startsWith('- '))) {
                    const listItems = lines.map(line => `<li class="my-1">${line.trim().substring(2)}</li>`).join('');
                    return `<ul class="list-disc list-outside ml-6 my-2">${listItems}</ul>`;
                }

                // Check for Ordered List (all lines must start with number.)
                if (lines.every(line => /^\s*\d+\.\s/.test(line))) {
                    const listItems = lines.map(line => `<li class="my-1">${line.trim().replace(/^\d+\.\s/, '')}</li>`).join('');
                    return `<ol class="list-decimal list-outside ml-6 my-2">${listItems}</ol>`;
                }
                
                // Otherwise, it's a paragraph. Preserve single line breaks within the block.
                return `<p class="my-2 leading-relaxed">${trimmedBlock.replace(/\n/g, '<br />')}</p>`;
            })
            .join('');

        // Process inline elements (bold) across the entire HTML
        htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        return { __html: htmlContent };
    };

    return <div dangerouslySetInnerHTML={renderContent()} />;
};

export default MarkdownRenderer;
