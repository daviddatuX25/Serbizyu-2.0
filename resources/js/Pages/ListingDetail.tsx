import ProductExperience from './ProductExperience';
import type { HomeProps } from '../types';

export default function ListingDetail(props: HomeProps) {
    return <ProductExperience {...props} experience="foundation_v1" pageMode="detail" />;
}
