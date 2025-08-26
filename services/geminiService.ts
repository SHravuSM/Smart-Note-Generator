import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file) => {
    // FIX: Specify Promise generic type to resolve type error for `data` property.
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        // FIX: Cast reader.result to string to use split method.
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

export const digitizeNote = async (file) => {
    try {
        const imagePart = await fileToGenerativePart(file);
        const textPart = {
            text: `Transcribe the handwritten text from this image. The notes are from a student. 
            Ensure the output is clean, well-formatted, and easy to read. 
            Correct any obvious spelling mistakes and structure the content logically with headings and bullet points if applicable.`
        };
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        return response.text;
    } catch (error) {
        console.error("Error digitizing note:", error);
        throw new Error("Failed to digitize the note. Please try again.");
    }
};

export const summarizeText = async (text) => {
    try {
        const prompt = `Summarize the following notes into key points for quick revision. 
        Focus on the most important concepts, definitions, and formulas. 
        Use bullet points for clarity.

        Notes:
        ---
        ${text}
        ---
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error summarizing text:", error);
        throw new Error("Failed to summarize the text. Please try again.");
    }
};

export const generateQuiz = async (text) => {
    try {
        const prompt = `Based on the following notes, generate a 5-question multiple-choice quiz to test understanding. 
        For each question, provide 4 options and clearly indicate the correct answer.

        Notes:
        ---
        ${text}
        ---
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        quiz: {
                            type: Type.ARRAY,
                            description: 'An array of quiz questions.',
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: {
                                        type: Type.STRING,
                                        description: 'The quiz question.'
                                    },
                                    options: {
                                        type: Type.ARRAY,
                                        description: 'An array of 4 possible answers.',
                                        items: { type: Type.STRING }
                                    },
                                    answer: {
                                        type: Type.STRING,
                                        description: 'The correct answer from the options.'
                                    }
                                }
                            }
                        }
                    }
                },
            },
        });
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.quiz || [];
    } catch (error) {
        console.error("Error generating quiz:", error);
        throw new Error("Failed to generate quiz. The content might not be suitable for quiz creation.");
    }
};

export const translateText = async (text, language) => {
    try {
        const prompt = `Translate the following notes to ${language}. 
        Maintain the original formatting as much as possible (e.g., headings, lists).

        Notes:
        ---
        ${text}
        ---
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error translating text:", error);
        throw new Error(`Failed to translate the text to ${language}. Please try again.`);
    }
};

export const generateTextbookChapter = async (text) => {
    try {
        // 1. Generate text content with image placeholders
        const textGenPrompt = `Based on the following notes, create a user-friendly textbook chapter. Structure the content with clear headings (use ## for main headings and ### for subheadings), paragraphs, and use markdown bold for key terms (**term**). Where a visual aid would be helpful to explain a concept, insert a placeholder in the format [IMAGE: A concise, descriptive prompt for an image generation model about the preceding topic.]. Only add images for the most important concepts.

        Notes:
        ---
        ${text}
        ---
        `;

        const textGenResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: textGenPrompt,
        });
        const chapterText = textGenResponse.text;
        
        // 2. Extract initial image prompts and the text preceding them
        const imagePlaceholderRegex = /\[IMAGE: (.*?)\]/g;
        const initialImagePrompts = [];
        let match;
        while ((match = imagePlaceholderRegex.exec(chapterText)) !== null) {
            initialImagePrompts.push(match[1]);
        }
        
        const textSegments = chapterText.split(imagePlaceholderRegex);
        let generatedImages = [];

        if (initialImagePrompts.length > 0) {
            // 3. Create enhanced prompts for each image using text context
            const enhancedPromptPromises = initialImagePrompts.map(async (initialPrompt, index) => {
                const contextSegment = textSegments[index * 2]; // Text before the placeholder
                const contextText = contextSegment.split(' ').slice(-150).join(' '); // Get last ~150 words of context

                const promptEnhancerPrompt = `Based on the following context from a textbook, create a detailed, visually appealing, and contextually accurate prompt for an image generation model. The original suggestion was "${initialPrompt}".

                The goal is to create a clear, educational image that helps a student understand the topic. The image style should be appropriate for a textbook (e.g., a clear diagram, an explanatory infographic, a realistic photo of a relevant object, or a helpful illustration). Avoid generic or abstract images.

                Context:
                ---
                ${contextText}
                ---

                Generate an enhanced prompt that is descriptive and ready for an AI image generator. The prompt should be a single, concise paragraph. For example, instead of 'a cell', the prompt could be 'A detailed diagram of an animal cell, labeling the nucleus, mitochondria, and cell membrane, in a clean, educational art style with vibrant colors and clear annotations.'

                Respond with ONLY the new, enhanced prompt.`;

                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: promptEnhancerPrompt,
                    });
                    return response.text.trim();
                } catch (err) {
                    console.error(`Failed to enhance prompt: "${initialPrompt}"`, err);
                    return initialPrompt; // Fallback to the original prompt
                }
            });

            const finalImagePrompts = await Promise.all(enhancedPromptPromises);

            // 4. Generate images concurrently with the new, enhanced prompts
            const imageGenerationPromises = finalImagePrompts.map(prompt =>
                ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: '4:3',
                    },
                }).catch(err => {
                    console.error(`Failed to generate image for prompt: "${prompt}"`, err);
                    return null;
                })
            );

            const imageGenerationResults = await Promise.all(imageGenerationPromises);

            generatedImages = imageGenerationResults
                .map((response, index) => {
                    if (response && response.generatedImages && response.generatedImages.length > 0) {
                        return {
                            url: `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`,
                            alt: finalImagePrompts[index] // Use the final prompt for alt text
                        };
                    }
                    return null;
                })
                .filter((img) => img !== null);
        }

        // 5. Weave text and images together into a final content array
        const finalContent = [];
        const finaltextParts = chapterText.split(/\[IMAGE:.*?\]/);
        
        finaltextParts.forEach((part, i) => {
            if (part.trim()) {
                finalContent.push({ type: 'text', content: part.trim() });
            }
            if (i < generatedImages.length) {
                finalContent.push({
                    type: 'image',
                    content: generatedImages[i].url,
                    alt: generatedImages[i].alt
                });
            }
        });

        return finalContent;

    } catch (error) {
        console.error("Error generating textbook chapter:", error);
        throw new Error("Failed to create the textbook chapter. The content might be too complex.");
    }
};