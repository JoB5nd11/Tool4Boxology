import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  XSD_TYPES,
  customSlug,
  valueError,
  type DataProperty,
  type SchemaProperty,
  type XsdType,
} from '../../utils/propertySchema';

export interface DataPropertiesDialogProps {
  open: boolean;
  title: string;
  /** Schema properties for this element; null = schema unavailable,
   *  undefined = still loading. */
  schema: SchemaProperty[] | null | undefined;
  initial: DataProperty[];
  onSave: (props: DataProperty[]) => void;
  onCancel: () => void;
}

type Row = DataProperty & { id: number };

const typeLabel = (t: XsdType) => XSD_TYPES.find((x) => x.value === t)?.label ?? 'Text';

// Edits a node's `props`: ontology properties offered for its type, plus
// free custom ones. Nothing is written until Save; Save is blocked while any
// value fails its datatype or a custom name is empty or clashes.
export default function DataPropertiesDialog({
  open,
  title,
  schema,
  initial,
  onSave,
  onCancel,
}: DataPropertiesDialogProps) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((p, i) => ({ ...p, id: i })));
  const [nextId, setNextId] = useState(initial.length);

  const addRow = (p: DataProperty) => {
    setRows((rs) => [...rs, { ...p, id: nextId }]);
    setNextId((n) => n + 1);
  };
  const update = (id: number, patch: Partial<DataProperty>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));

  // Name errors for custom rows: empty slug, or the same slug as an earlier row.
  const nameErrors = new Map<number, string>();
  const seen = new Set<string>();
  rows.filter((r) => r.iri === null).forEach((r) => {
    const slug = customSlug(r.label).toLowerCase();
    if (!slug) nameErrors.set(r.id, 'Name needs a letter or digit');
    else if (seen.has(slug)) nameErrors.set(r.id, 'Same name as another property');
    seen.add(slug);
  });
  const hasErrors = nameErrors.size > 0 || rows.some((r) => valueError(r.datatype, r.value));

  const schemaRows = rows.filter((r) => r.iri !== null);
  const customRows = rows.filter((r) => r.iri === null);
  const unused = (schema ?? []).filter((s) => !rows.some((r) => r.iri === s.iri));

  const save = () =>
    onSave(
      rows.map((r) => ({
        iri: r.iri,
        label: r.label.trim(),
        datatype: r.datatype,
        value: r.datatype === 'xsd:boolean' ? r.value.trim().toLowerCase() : r.value.trim(),
      }))
    );

  const valueInput = (r: Row, label: string) => {
    const error = valueError(r.datatype, r.value);
    const common = {
      size: 'small' as const,
      label,
      value: r.value,
      error: !!error,
      helperText: error ?? ' ',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => update(r.id, { value: e.target.value }),
      sx: { flex: 1, minWidth: 140 },
    };
    if (r.datatype === 'xsd:boolean') {
      return (
        <TextField select {...common}>
          <MenuItem value="true">true</MenuItem>
          <MenuItem value="false">false</MenuItem>
        </TextField>
      );
    }
    if (r.datatype === 'xsd:date') {
      return <TextField type="date" {...common} slotProps={{ inputLabel: { shrink: true } }} />;
    }
    return (
      <TextField
        {...common}
        slotProps={{
          htmlInput: { inputMode: r.datatype === 'xsd:string' ? 'text' : 'decimal' },
        }}
      />
    );
  };

  const removeButton = (r: Row) => (
    <IconButton aria-label="Remove property" size="small" onClick={() => remove(r.id)} sx={{ mt: 0.5 }}>
      <DeleteOutlineIcon fontSize="small" />
    </IconButton>
  );

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth data-testid="data-properties-dialog">
      <DialogTitle sx={{ fontWeight: 600 }}>Data properties — {title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Ontology properties
        </Typography>
        {schemaRows.map((r) => (
          <Box key={r.id} data-testid="prop-row" sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            {valueInput(r, `${r.label} · ${typeLabel(r.datatype)}`)}
            {removeButton(r)}
          </Box>
        ))}
        {schema === undefined && (
          <Typography variant="body2" color="text.secondary">Loading schema…</Typography>
        )}
        {schema === null && (
          <Typography variant="body2" color="text.secondary">
            Schema unavailable — custom properties only
          </Typography>
        )}
        {schema && schema.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No ontology properties for this element type yet.
          </Typography>
        )}
        {schema && schema.length > 0 && (
          <TextField
            select
            size="small"
            label="Add property"
            value=""
            disabled={unused.length === 0}
            onChange={(e) => {
              const s = unused.find((u) => u.iri === e.target.value);
              if (s) addRow({ iri: s.iri, label: s.label, datatype: s.datatype, value: '' });
            }}
            sx={{ minWidth: 220, mt: 1 }}
          >
            {unused.map((s) => (
              <MenuItem key={s.iri} value={s.iri}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        )}

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
          Custom properties
        </Typography>
        {customRows.map((r) => (
          <Box key={r.id} data-testid="prop-row" sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              label="Name"
              value={r.label}
              error={nameErrors.has(r.id)}
              helperText={nameErrors.get(r.id) ?? ' '}
              onChange={(e) => update(r.id, { label: e.target.value })}
              sx={{ flex: 1, minWidth: 120 }}
            />
            <TextField
              select
              size="small"
              label="Type"
              value={r.datatype}
              onChange={(e) => update(r.id, { datatype: e.target.value as XsdType })}
              sx={{ width: 140 }}
            >
              {XSD_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            {valueInput(r, 'Value')}
            {removeButton(r)}
          </Box>
        ))}
        <Button
          size="small"
          onClick={() => addRow({ iri: null, label: '', datatype: 'xsd:string', value: '' })}
        >
          Add custom
        </Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit">Cancel</Button>
        <Button onClick={save} variant="contained" disabled={hasErrors}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
