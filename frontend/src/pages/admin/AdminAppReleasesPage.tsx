import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { appReleaseService, type AppRelease } from "../../services/appReleaseService";
import { publishSelectedApk } from "../../utils/publishApkRelease";
import { nextVersionName } from "../../utils/appRelease";
import { he } from "../../i18n/he";
import PageHeader from "../../components/ui/PageHeader";

export default function AdminAppReleasesPage() {
  const [items, setItems] = useState<AppRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [versionName, setVersionName] = useState("1.1");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listed = await appReleaseService.list();
      setItems(listed);
      if (listed[0]?.version_name) setVersionName(nextVersionName(listed[0].version_name));
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePublish = () =>
    void publishFromForm({
      file,
      versionName,
      setPublishing,
      setError,
      setSuccess,
      setFile,
      load,
    });

  return (
    <Box>
      <PageHeader title={he.adminAppReleases} subtitle={he.adminAppReleasesSubtitle} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}
      <ReleasePublishForm
        versionName={versionName}
        file={file}
        publishing={publishing}
        onVersionName={setVersionName}
        onFile={setFile}
        onPublish={handlePublish}
      />
      <ReleaseTable items={items} loading={loading} />
    </Box>
  );
}

type PublishArgs = {
  file: File | null;
  versionName: string;
  setPublishing: (value: boolean) => void;
  setError: (value: string) => void;
  setSuccess: (value: string) => void;
  setFile: (value: File | null) => void;
  load: () => Promise<void>;
};

async function publishFromForm(args: PublishArgs): Promise<void> {
  if (!args.file) {
    args.setError(he.adminAppReleaseApkFile);
    return;
  }
  args.setPublishing(true);
  args.setError("");
  args.setSuccess("");
  try {
    await publishSelectedApk(args.file, args.versionName.trim());
    args.setSuccess(he.adminAppReleasePublished);
    args.setFile(null);
    await args.load();
  } catch (e) {
    args.setError(e instanceof ApiError ? e.message : he.errorGeneric);
  } finally {
    args.setPublishing(false);
  }
}

type FormProps = {
  versionName: string;
  file: File | null;
  publishing: boolean;
  onVersionName: (value: string) => void;
  onFile: (file: File | null) => void;
  onPublish: () => void;
};

function ReleasePublishForm(props: FormProps) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, maxWidth: 560 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        {he.adminAppReleasePublish}
      </Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        <TextField
          label={he.adminAppReleaseVersionName}
          helperText={he.adminAppReleaseVersionHint}
          value={props.versionName}
          onChange={(e) => props.onVersionName(e.target.value)}
          required
          placeholder="1.1"
        />
        <Button variant="outlined" component="label">
          {props.file ? props.file.name : he.adminAppReleaseApkFile}
          <input
            hidden
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={(e) => props.onFile(e.target.files?.[0] ?? null)}
          />
        </Button>
        <Button variant="contained" onClick={props.onPublish} disabled={props.publishing}>
          {props.publishing ? <CircularProgress size={22} color="inherit" /> : he.adminAppReleasePublish}
        </Button>
      </Box>
    </Paper>
  );
}

function ReleaseTable({ items, loading }: { items: AppRelease[]; loading: boolean }) {
  if (loading) return <CircularProgress />;
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{he.adminAppReleaseVersionName}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.version_name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
