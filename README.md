# DolessHQ UI

DolessHQ UI is a collection of UI components for the DolessHQ platform.
Visit [DolessHQ UI](https://doless-ui.vercel.app/) to see the components in action.

## Custom Components (registry/doless)

The `registry/new-york/doless` folder contains client-side components intended
for reuse across apps. Each component exposes a minimal prop surface for common
date and color interactions.

### ColorPickerPopover

A popover-based color picker with preset swatches and a custom color input.

Props:

- `value`: Current color hex string.
- `onChange`: Callback invoked with the next color string.
- `presets`: Optional array of preset hex strings.
- `children`: Trigger element rendered via `PopoverTrigger`.
- `className`: Optional class override for the popover content.

### DatePicker

Single-date picker with optional clear action and date bounds.

Props:

- `label`: Optional label text.
- `id`: Optional id for the trigger button.
- `value`: Controlled value (`Date`, ISO string, or `null`).
- `defaultValue`: Uncontrolled initial value (`Date`, ISO string, or `null`).
- `onChange`: Emits a `DatePickerValue` payload.
- `onBlur`: Optional blur callback after selection/close.
- `placeholder`: Placeholder text when no date is selected.
- `dateFormat`: Display format string (date-fns).
- `disabled`: Disables the trigger and calendar.
- `clearable`: Shows a clear action when true.
- `clearLabel`: Label for the clear action.
- `minDate`/`maxDate`: Date bounds (`Date`, ISO string, or `null`).
- `disabledDates`: `react-day-picker` disabled matcher(s).
- `numberOfMonths`: Number of months to show.
- `className`: Wrapper class override.
- `triggerClassName`: Trigger button class override.
- `calendarClassName`: Popover content class override.

`DatePickerValue` shape:

- `date`: Selected `Date` or `null`.
- `formatted`: Formatted display string or `null`.
- `iso`: ISO string or `null`.
- `label`: Friendly label string.

### DateRangePicker

Date range picker with range/before/after modes, presets, and clear action.

Props:

- `label`: Optional label text.
- `onUpdate`: Emits a `DateRangePickerUpdate` payload.
- `modes`: Array of enabled modes (`"range" | "after" | "before"`).
- `initialMode`: Starting selection mode.
- `initialDateFrom`/`initialDateTo`: Initial bounds (`Date`, ISO string, or `null`).
- `dateFormat`: Display format string (date-fns).
- `placeholder`: Placeholder text when no selection.
- `disabled`: Disables the trigger and calendar.
- `className`: Wrapper class override.
- `id`: Optional id for the trigger button.
- `numberOfMonths`: Number of months to show.
- `clearable`: Shows a clear action when true.
- `clearLabel`: Label for the clear action.
- `triggerClassName`: Trigger button class override.
- `showPresets`: Shows preset buttons when true.
- `calendarClassName`: Popover content class override.

`DateRangePickerUpdate` shape:

- `range`: Raw `react-day-picker` range or `undefined`.
- `from`/`to`: Normalized bounds for the active mode.
- `mode`: Active selection mode.
- `formatted`: `{ from, to, label }` strings.
- `iso`: `{ from, to }` ISO strings.

### MultiDatePicker

Multi-select date picker with removable date badges and optional max count.

Props:

- `label`: Optional label text.
- `id`: Optional id for the trigger button.
- `value`: Controlled array of ISO date strings.
- `defaultValue`: Uncontrolled array of ISO date strings.
- `onChange`: Emits a `MultiDatePickerValue` payload.
- `onBlur`: Optional blur callback after selection/close.
- `placeholder`: Placeholder text when no dates are selected.
- `dateFormat`: Display format string (date-fns).
- `disabled`: Disables the trigger and calendar.
- `clearable`: Shows a clear action when true.
- `clearLabel`: Label for the clear action.
- `minDate`/`maxDate`: Date bounds (`Date`, ISO string, or `null`).
- `disabledDates`: `react-day-picker` disabled matcher(s).
- `numberOfMonths`: Number of months to show.
- `className`: Wrapper class override.
- `triggerClassName`: Trigger button class override.
- `calendarClassName`: Popover content class override.
- `maxDates`: Maximum number of dates that can be selected.

`MultiDatePickerValue` shape:

- `dates`: Selected `Date[]`.
- `formatted`: Formatted display strings.
- `iso`: ISO strings.
- `label`: Summary label string.
