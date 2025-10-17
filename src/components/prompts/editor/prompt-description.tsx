"use client";

interface PromptDescriptionProps {
  description: string;
  onDescriptionChange: (description: string) => void;
  maxLength?: number;
}

export function PromptDescription({
  description,
  onDescriptionChange,
  maxLength = 256
}: PromptDescriptionProps) {
  return (
    <div className="h-36 p-4 border-b">
      <textarea
        placeholder="Enter prompt description (optional)..."
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        maxLength={maxLength}
        className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={3}
      />
      <div className="text-xs text-gray-500 mt-2 text-right">
        {description.length}/{maxLength} characters
      </div>
    </div>
  );
}
