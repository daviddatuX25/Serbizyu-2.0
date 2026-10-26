import {
    TenderWorkspace,
    type TenderWorkspaceRecord,
} from '../../components/quotes/TenderWorkspace';

export default function MyRequests({ records }: { records: TenderWorkspaceRecord[] }) {
    return <TenderWorkspace records={records} mode="requests" />;
}
