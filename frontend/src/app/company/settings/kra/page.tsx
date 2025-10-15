"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getKRASettings, updateKRASettings, type KRASettings, type KRAField, type KRARatingScale, type KRAWeightConfig, type KRACriteria, type KRANotifications } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import RoleGuard from "@/components/RoleGuard";
import { Plus, Trash2, Save, Settings, Target, Star, Weight, Bell, Eye } from "lucide-react";

export default function KRASettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<KRASettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch KRA settings
  const { data: kraSettings, isLoading } = useQuery({
    queryKey: ["kra-settings"],
    queryFn: getKRASettings,
    staleTime: 300000, // Cache for 5 minutes
  });

  // Update KRA settings mutation
  const updateMutation = useMutation({
    mutationFn: updateKRASettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kra-settings"] });
      setIsEditing(false);
      toast.success("KRA settings updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update KRA settings");
    },
  });

  useEffect(() => {
    if (kraSettings) {
      setSettings(kraSettings);
    }
  }, [kraSettings]);

  const handleSave = () => {
    if (settings) {
      updateMutation.mutate(settings);
    }
  };

  const handleCancel = () => {
    setSettings(kraSettings || null);
    setIsEditing(false);
  };

  const addField = () => {
    if (!settings) return;
    
    const newField: KRAField = {
      id: `field_${Date.now()}`,
      name: "",
      type: "text",
      required: false,
      default: "",
      placeholder: "",
      help_text: "",
      order: settings.default_fields.length + 1,
    };
    
    setSettings({
      ...settings,
      default_fields: [...settings.default_fields, newField],
    });
  };

  const updateField = (index: number, field: Partial<KRAField>) => {
    if (!settings) return;
    
    const updatedFields = [...settings.default_fields];
    updatedFields[index] = { ...updatedFields[index], ...field };
    
    setSettings({
      ...settings,
      default_fields: updatedFields,
    });
  };

  const removeField = (index: number) => {
    if (!settings) return;
    
    const updatedFields = settings.default_fields.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      default_fields: updatedFields,
    });
  };

  const addCriteria = () => {
    if (!settings) return;
    
    const newCriteria: KRACriteria = {
      id: `criteria_${Date.now()}`,
      name: "",
      description: "",
      weight: 0,
      required: false,
      type: "performance",
    };
    
    setSettings({
      ...settings,
      evaluation_criteria: [...settings.evaluation_criteria, newCriteria],
    });
  };

  const updateCriteria = (index: number, criteria: Partial<KRACriteria>) => {
    if (!settings) return;
    
    const updatedCriteria = [...settings.evaluation_criteria];
    updatedCriteria[index] = { ...updatedCriteria[index], ...criteria };
    
    setSettings({
      ...settings,
      evaluation_criteria: updatedCriteria,
    });
  };

  const removeCriteria = (index: number) => {
    if (!settings) return;
    
    const updatedCriteria = settings.evaluation_criteria.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      evaluation_criteria: updatedCriteria,
    });
  };

  const addMeasurementUnit = () => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      measurement_units: [...settings.measurement_units, ""],
    });
  };

  const updateMeasurementUnit = (index: number, value: string) => {
    if (!settings) return;
    
    const updatedUnits = [...settings.measurement_units];
    updatedUnits[index] = value;
    
    setSettings({
      ...settings,
      measurement_units: updatedUnits,
    });
  };

  const removeMeasurementUnit = (index: number) => {
    if (!settings) return;
    
    const updatedUnits = settings.measurement_units.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      measurement_units: updatedUnits,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading KRA settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load KRA settings</p>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["HR", "Admin", "God"]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            KRA Settings
          </h1>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Edit Settings
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Default Fields Configuration */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Default KRA Fields</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Configure the default fields that will be available when creating KRAs.
          </p>
          
          <div className="space-y-4">
            {settings.default_fields.map((field, index) => (
              <div key={field.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Field Name"
                    value={field.name}
                    onChange={(e) => updateField(index, { name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., KRA Title"
                  />
                  <Select
                    label="Field Type"
                    value={field.type}
                    onChange={(e) => updateField(index, { type: e.target.value as any })}
                    disabled={!isEditing}
                    options={[
                      { value: "text", label: "Text" },
                      { value: "number", label: "Number" },
                      { value: "percentage", label: "Percentage" },
                      { value: "select", label: "Select" },
                      { value: "textarea", label: "Text Area" },
                    ]}
                  />
                  <Input
                    label="Placeholder"
                    value={field.placeholder}
                    onChange={(e) => updateField(index, { placeholder: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Enter placeholder text"
                  />
                  <Input
                    label="Help Text"
                    value={field.help_text}
                    onChange={(e) => updateField(index, { help_text: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Enter help text"
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        disabled={!isEditing}
                        className="rounded"
                      />
                      <span className="text-sm">Required</span>
                    </label>
                    <Input
                      label="Order"
                      type="number"
                      value={field.order}
                      onChange={(e) => updateField(index, { order: parseInt(e.target.value) || 0 })}
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                  {isEditing && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeField(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isEditing && (
              <Button onClick={addField} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            )}
          </div>
        </Card>

        {/* Measurement Units */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Weight className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Measurement Units</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Configure available measurement units for KRA targets and actual values.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            {settings.measurement_units.map((unit, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={unit}
                  onChange={(e) => updateMeasurementUnit(index, e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., %, count, hours"
                />
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeMeasurementUnit(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {isEditing && (
            <Button onClick={addMeasurementUnit} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          )}
        </Card>

        {/* Rating Scale */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Rating Scale</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Configure the rating scale used for KRA evaluations.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Minimum Rating"
              type="number"
              step="0.1"
              value={settings.rating_scale.min}
              onChange={(e) => setSettings({
                ...settings,
                rating_scale: { ...settings.rating_scale, min: parseFloat(e.target.value) || 1 }
              })}
              disabled={!isEditing}
            />
            <Input
              label="Maximum Rating"
              type="number"
              step="0.1"
              value={settings.rating_scale.max}
              onChange={(e) => setSettings({
                ...settings,
                rating_scale: { ...settings.rating_scale, max: parseFloat(e.target.value) || 5 }
              })}
              disabled={!isEditing}
            />
            <Input
              label="Step"
              type="number"
              step="0.1"
              value={settings.rating_scale.step}
              onChange={(e) => setSettings({
                ...settings,
                rating_scale: { ...settings.rating_scale, step: parseFloat(e.target.value) || 0.1 }
              })}
              disabled={!isEditing}
            />
            <Input
              label="Description"
              value={settings.rating_scale.description}
              onChange={(e) => setSettings({
                ...settings,
                rating_scale: { ...settings.rating_scale, description: e.target.value }
              })}
              disabled={!isEditing}
            />
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium mb-2">Rating Labels</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(settings.rating_scale.labels).map(([rating, label]) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="w-8 text-sm font-medium">{rating}:</span>
                  <Input
                    value={label}
                    onChange={(e) => setSettings({
                      ...settings,
                      rating_scale: {
                        ...settings.rating_scale,
                        labels: { ...settings.rating_scale.labels, [rating]: e.target.value }
                      }
                    })}
                    disabled={!isEditing}
                    placeholder="Label"
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Weight Distribution */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Weight className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold">Weight Distribution</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Configure how KRA weights are distributed and validated.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Max Total Weight (%)"
              type="number"
              value={settings.weight_distribution.max_total_weight}
              onChange={(e) => setSettings({
                ...settings,
                weight_distribution: { ...settings.weight_distribution, max_total_weight: parseFloat(e.target.value) || 100 }
              })}
              disabled={!isEditing}
            />
            <Input
              label="Min Individual Weight (%)"
              type="number"
              value={settings.weight_distribution.min_individual_weight}
              onChange={(e) => setSettings({
                ...settings,
                weight_distribution: { ...settings.weight_distribution, min_individual_weight: parseFloat(e.target.value) || 1 }
              })}
              disabled={!isEditing}
            />
            <Input
              label="Max Individual Weight (%)"
              type="number"
              value={settings.weight_distribution.max_individual_weight}
              onChange={(e) => setSettings({
                ...settings,
                weight_distribution: { ...settings.weight_distribution, max_individual_weight: parseFloat(e.target.value) || 50 }
              })}
              disabled={!isEditing}
            />
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.weight_distribution.allow_overflow}
                  onChange={(e) => setSettings({
                    ...settings,
                    weight_distribution: { ...settings.weight_distribution, allow_overflow: e.target.checked }
                  })}
                  disabled={!isEditing}
                  className="rounded"
                />
                <span className="text-sm">Allow Weight Overflow</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.weight_distribution.auto_distribute}
                  onChange={(e) => setSettings({
                    ...settings,
                    weight_distribution: { ...settings.weight_distribution, auto_distribute: e.target.checked }
                  })}
                  disabled={!isEditing}
                  className="rounded"
                />
                <span className="text-sm">Auto Distribute Weights</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Evaluation Criteria */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-semibold">Evaluation Criteria</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Define the criteria used for evaluating KRAs.
          </p>
          
          <div className="space-y-4">
            {settings.evaluation_criteria.map((criteria, index) => (
              <div key={criteria.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Criteria Name"
                    value={criteria.name}
                    onChange={(e) => updateCriteria(index, { name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Performance"
                  />
                  <Select
                    label="Type"
                    value={criteria.type}
                    onChange={(e) => updateCriteria(index, { type: e.target.value as any })}
                    disabled={!isEditing}
                    options={[
                      { value: "performance", label: "Performance" },
                      { value: "behavior", label: "Behavior" },
                      { value: "skill", label: "Skill" },
                      { value: "goal", label: "Goal" },
                    ]}
                  />
                  <Input
                    label="Description"
                    value={criteria.description}
                    onChange={(e) => updateCriteria(index, { description: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Describe this criteria"
                  />
                  <Input
                    label="Weight (%)"
                    type="number"
                    value={criteria.weight}
                    onChange={(e) => updateCriteria(index, { weight: parseFloat(e.target.value) || 0 })}
                    disabled={!isEditing}
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={criteria.required}
                        onChange={(e) => updateCriteria(index, { required: e.target.checked })}
                        disabled={!isEditing}
                        className="rounded"
                      />
                      <span className="text-sm">Required</span>
                    </label>
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCriteria(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isEditing && (
              <Button onClick={addCriteria} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Criteria
              </Button>
            )}
          </div>
        </Card>

        {/* Notification Settings */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-semibold">Notification Settings</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Configure notification preferences for KRA-related events.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reminder Days Before Due</label>
              <div className="flex flex-wrap gap-2">
                {settings.notification_settings.reminder_days_before_due.map((day, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                    {day} days
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notification_settings.notify_on_creation}
                  onChange={(e) => setSettings({
                    ...settings,
                    notification_settings: { ...settings.notification_settings, notify_on_creation: e.target.checked }
                  })}
                  disabled={!isEditing}
                  className="rounded"
                />
                <span className="text-sm">Notify on Creation</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notification_settings.notify_on_evaluation}
                  onChange={(e) => setSettings({
                    ...settings,
                    notification_settings: { ...settings.notification_settings, notify_on_evaluation: e.target.checked }
                  })}
                  disabled={!isEditing}
                  className="rounded"
                />
                <span className="text-sm">Notify on Evaluation</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notification_settings.notify_on_completion}
                  onChange={(e) => setSettings({
                    ...settings,
                    notification_settings: { ...settings.notification_settings, notify_on_completion: e.target.checked }
                  })}
                  disabled={!isEditing}
                  className="rounded"
                />
                <span className="text-sm">Notify on Completion</span>
              </label>
            </div>
          </div>
        </Card>
      </div>
    </RoleGuard>
  );
}
