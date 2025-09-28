# Progress Bar Color Changes

## Updated Color Logic

The comparison progress bars now use dynamic colors based on the percentage of consumed vs recommended nutrients:

### Color Rules:
- **Green** (`#48BB78`) - When percentage is **≤ 50%**
- **Red** (`#F56565`) - When percentage is **> 50%**
- **Gray** (`#4A5568`) - When no recommendation is available

### Examples:
- 0% consumed: Green
- 25% consumed: Green
- 50% consumed: Green (exactly at threshold)
- 51% consumed: Red
- 75% consumed: Red
- 100% consumed: Red
- 150% consumed: Red

### Implementation Details:
- Modified `ComparisonCard.tsx` component
- Added `getProgressBarColor()` function
- Uses existing theme colors (`Colors.success` and `Colors.error`)
- Maintains backward compatibility with existing data structure

### Files Changed:
- `src/components/ComparisonCard.tsx` - Main implementation
- Added color logic function and updated progress bar styling

The changes are automatically applied to all comparison views in the app without requiring any data migration or additional configuration.
