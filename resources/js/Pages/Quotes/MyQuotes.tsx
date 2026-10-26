import {
    TenderWorkspace,
    type TenderWorkspaceRecord,
} from '../../components/quotes/TenderWorkspace';

export default function MyQuotes({ records }: { records: TenderWorkspaceRecord[] }) {
    return <TenderWorkspace records={records} mode="quotes" />;
}
