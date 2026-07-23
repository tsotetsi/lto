// frontend/components/VariableForm.tsx
import React, { useState, useEffect } from 'react';
import { Template, TemplateVariable } from '../types/template';

interface VariableFormProps {
  template: Template;
  initialData?: Record<string, string>;
  onSubmit: (variables: Record<string, string>) => void;
  onCancel: () => void;
}

const VariableForm: React.FC<VariableFormProps> = ({
  template,
  initialData = {},
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with defaults
  useEffect(() => {
    setFormData(() => {
      const initialFormData: Record<string, string> = {};
      Object.entries(template.variables).forEach(([key, variable]) => {
        initialFormData[key] = initialData[key] || variable.default || '';
      });
      return initialFormData;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const handleChange = (variableName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [variableName]: value
    }));
    
    // Clear error when user starts typing
    if (errors[variableName]) {
      setErrors(prev => ({
        ...prev,
        [variableName]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    Object.entries(template.variables).forEach(([key, variable]) => {
      if (variable.required && !formData[key]?.trim()) {
        newErrors[key] = `${variable.label} is required`;
      }
      
      // Email validation
      if (variable.type === 'email' && formData[key]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[key])) {
          newErrors[key] = 'Please enter a valid email address';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderInput = (variableName: string, variable: TemplateVariable) => {
    const value = formData[variableName] || '';
    const error = errors[variableName];
    
    if (variable.type === 'multiline') {
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {variable.label} {variable.required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={value}
            onChange={(e) => handleChange(variableName, e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-700'
            }`}
            rows={4}
            placeholder={`Enter ${variable.label.toLowerCase()}...`}
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
      );
    }
    
    return (
      <div>
        <label className="block text-sm font-medium mb-2">
          {variable.label} {variable.required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={variable.type === 'email' ? 'email' : 'text'}
          value={value}
          onChange={(e) => handleChange(variableName, e.target.value)}
          className={`w-full px-3 py-2 bg-gray-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-700'
          }`}
          placeholder={`Enter ${variable.label.toLowerCase()}...`}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Fill Template: {template.name}</h2>
        <p className="text-gray-400">{template.description}</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {Object.entries(template.variables).map(([key, variable]) => (
          <div key={key}>
            {renderInput(key, variable)}
          </div>
        ))}
        
        <div className="flex gap-4 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-700 rounded-md hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
          >
            Generate Resume
          </button>
        </div>
      </form>
    </div>
  );
};

export default VariableForm;