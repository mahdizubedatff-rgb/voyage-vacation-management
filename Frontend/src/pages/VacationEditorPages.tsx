import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useSaveVacation, useVacation } from "../hooks/useVacations";
import { getErrorMessage } from "../services/api";
import { toDateInput } from "../utils/format";
import { VacationForm } from "../components/VacationForm";
import { ErrorState, PageHeader } from "../components/ui/States";
import { PageLoader } from "../components/ui/Spinner";

function BackLink() {
  return (
    <Link to="/vacations" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      Back to vacations
    </Link>
  );
}

export function AddVacationPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const save = useSaveVacation();

  return (
    <div className="container-page py-10 sm:py-14">
      <BackLink />
      <PageHeader eyebrow="New listing" title="Add a vacation" description="Create a new escape for travellers to discover." />
      <div className="mt-10">
        <VacationForm
          mode="create"
          submitting={save.isPending}
          onSubmit={async (values) => {
            const created = await save.mutateAsync(values);
            toast.success(`${created.destination} was added`);
            navigate("/vacations");
          }}
        />
      </div>
    </div>
  );
}

export function EditVacationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: vacation, isPending, isError, error, refetch } = useVacation(id);
  const save = useSaveVacation(id);

  return (
    <div className="container-page py-10 sm:py-14">
      <BackLink />
      {isPending ? (
        <PageLoader label="Loading vacation" />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error, "This vacation could not be loaded.")} onRetry={() => void refetch()} />
      ) : (
        <>
          <PageHeader eyebrow="Edit listing" title={`Edit ${vacation.destination}`} description="Update any detail. The current image is kept unless you replace it." />
          <div className="mt-10">
            <VacationForm
              key={vacation.id}
              mode="edit"
              existingImageUrl={vacation.imageUrl}
              defaultValues={{
                destination: vacation.destination,
                description: vacation.description,
                startDate: toDateInput(vacation.startDate),
                endDate: toDateInput(vacation.endDate),
                price: vacation.price,
              }}
              submitting={save.isPending}
              onSubmit={async (values) => {
                const updated = await save.mutateAsync(values);
                toast.success(`${updated.destination} was updated`);
                navigate("/vacations");
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
