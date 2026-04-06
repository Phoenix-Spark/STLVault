import { Typography } from "@mui/material";
import { Folder } from "../types";

interface CrumbProps {
  folders: Folder[];
  currentFolderId: string;
  onNavigateFolder: (id: string) => void;
}

const Crumb: React.FC<CrumbProps> = ({ folders, currentFolderId, onNavigateFolder }) => {
    console.log('folders: ', folders, ' id: ', currentFolderId)
  const buildPath = (): { name: string; id: string }[] => {
    const root = { name: "Home", id: "all" };
    if (currentFolderId === "all") return [root];

    const path: { name: string; id: string }[] = [];
    let id: string | null = currentFolderId;

    while (id) {
      const folder = folders.find((f) => f.id === id);
      if (!folder) break;
      path.unshift({ name: folder.name, id: folder.id });
      id = folder.parentId;
    }

    return [root, ...path];
  };

  const crumbs = buildPath();

  return (
    <Typography >
      {crumbs.map((crumb, i) => (
        <span id={crumb.id} onClick={() => onNavigateFolder(crumb.id)} style={{ cursor: "pointer", fontSize: i === crumbs.length - 1 ? "1.3em" : "0.9em" }}>
          {i > 0 && " / "}
          {crumb.name}
        </span>
      ))}
    </Typography>
  );
};

export default Crumb;
