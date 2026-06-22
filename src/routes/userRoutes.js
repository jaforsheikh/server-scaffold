import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import axiosPublic from "../../api/axiosPublic";
import BloodBadge from "../../components/common/BloodBadge";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import StatusBadge from "../../components/common/StatusBadge";
import useAuth from "../../hooks/useAuth";
import { DONATION_STATUS_OPTIONS } from "../../utils/constants";
import { formatDate } from "../../utils/dateFormatter";

const REQUESTS_PER_PAGE = 10;

const filterOptions = [{ label: "All", value: "" }, ...DONATION_STATUS_OPTIONS];

const AllBloodDonationRequests = () => {
  const { isAdmin, isVolunteer } = useAuth();

  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const canManageFullRequest = isAdmin;
  const canUpdateStatus = isAdmin || isVolunteer;

  const loadAllRequests = async (page = 1, status = statusFilter) => {
    setLoading(true);

    try {
      const { data } = await axiosPublic.get("/api/donation-requests/all", {
        params: {
          page,
          limit: REQUESTS_PER_PAGE,
          status: status || undefined,
        },
      });

      setRequests(data?.requests || []);
      setTotalRequests(data?.total || 0);
      setTotalPages(data?.totalPages || 0);
      setCurrentPage(data?.page || page);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to load donation requests."
      );

      setRequests([]);
      setTotalRequests(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllRequests(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleStatusUpdate = async (requestId, status) => {
    const confirmResult = await Swal.fire({
      title: "Update request status?",
      text: `This donation request status will be updated to ${status}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, update",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#C1121F",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      await axiosPublic.patch(`/api/donation-requests/${requestId}/status`, {
        status,
      });

      toast.success(`Request status updated to ${status}.`);
      await loadAllRequests(currentPage, statusFilter);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to update request status."
      );
    }
  };

  const handleDeleteRequest = async (requestId) => {
    const confirmResult = await Swal.fire({
      title: "Delete this request?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#C1121F",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      await axiosPublic.delete(`/api/donation-requests/${requestId}`);

      toast.success("Donation request deleted successfully.");
      await loadAllRequests(currentPage, statusFilter);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to delete donation request."
      );
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;

    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  return (
    <section className="space-y-8">
      <div className="sc-card p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-primary-tint text-primary">
              <span className="material-symbols-rounded text-4xl">
                volunteer_activism
              </span>
            </span>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                All Blood Donation Requests
              </p>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Manage donation requests
              </h1>

              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-ink-muted">
                Admin can manage all requests. Volunteers can view all requests
                and update status only.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-surface-border bg-white px-6 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-muted">
              Total Requests
            </p>

            <p className="mt-1 text-3xl font-extrabold text-primary">
              {totalRequests}
            </p>
          </div>
        </div>
      </div>

      <div className="sc-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink">
              Filter Requests
            </h2>

            <p className="mt-1 text-sm font-semibold text-ink-muted">
              Filter all donation requests by status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => handleStatusFilter(option.value)}
                className={[
                  "rounded-2xl px-5 py-3 text-sm font-extrabold transition",
                  statusFilter === option.value
                    ? "bg-primary text-white shadow-soft"
                    : "border border-surface-border bg-white text-ink hover:bg-primary-tint hover:text-primary",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="sc-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-surface-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">
              Request Table
            </h2>

            <p className="mt-1 text-sm font-semibold text-ink-muted">
              Showing {requests.length} of {totalRequests} donation requests.
            </p>
          </div>

          <span className="w-fit rounded-full bg-primary-tint px-4 py-2 text-xs font-extrabold text-primary">
            {isAdmin ? "Admin Full Access" : "Volunteer Status Access"}
          </span>
        </div>

        {loading ? (
          <div className="p-10">
            <Loader />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary-tint text-primary">
              <span className="material-symbols-rounded text-4xl">
                inventory_2
              </span>
            </span>

            <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
              No donation request found
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-ink-muted">
              Donation requests will appear here when users create them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="border-surface-border text-xs uppercase tracking-[0.12em] text-ink-muted">
                  <th>Blood</th>
                  <th>Recipient</th>
                  <th>Requester</th>
                  <th>Location</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Donor</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => {
                  const requestId = request.id || request._id;
                  const locationText = `${
                    request.district || request.recipientDistrict || "N/A"
                  }, ${request.upazila || request.recipientUpazila || "N/A"}`;

                  return (
                    <tr key={requestId} className="border-surface-border">
                      <td>
                        <BloodBadge group={request.bloodGroup} size="sm" />
                      </td>

                      <td>
                        <p className="font-extrabold text-ink">
                          {request.recipientName}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-ink-muted">
                          {request.hospitalName}
                        </p>
                      </td>

                      <td>
                        <p className="font-bold text-ink">
                          {request.requesterName || "Unknown"}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-ink-muted">
                          {request.requesterEmail}
                        </p>
                      </td>

                      <td>
                        <p className="font-bold text-ink">{locationText}</p>

                        <p className="mt-1 text-xs font-semibold text-ink-muted">
                          {request.fullAddress}
                        </p>
                      </td>

                      <td>
                        <p className="font-bold text-ink">
                          {formatDate(request.donationDate)}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-ink-muted">
                          {request.donationTime}
                        </p>
                      </td>

                      <td>
                        <StatusBadge status={request.status} />
                      </td>

                      <td>
                        {request.donorEmail ? (
                          <div>
                            <p className="font-bold text-ink">
                              {request.donorName || "Unknown"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-ink-muted">
                              {request.donorEmail}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-ink-muted">
                            Not assigned
                          </p>
                        )}
                      </td>

                      <td>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link to={`/donation-requests/${requestId}`}>
                            <ActionButton icon="visibility" label="View" />
                          </Link>

                          {canManageFullRequest ? (
                            <>
                              <Link
                                to={`/dashboard/update-donation-request/${requestId}`}
                              >
                                <ActionButton icon="edit" label="Edit" />
                              </Link>

                              <ActionButton
                                icon="delete"
                                label="Delete"
                                tone="danger"
                                onClick={() => handleDeleteRequest(requestId)}
                              />
                            </>
                          ) : null}

                          {canUpdateStatus ? (
                            <StatusSelect
                              currentStatus={request.status}
                              onChange={(status) =>
                                handleStatusUpdate(requestId, status)
                              }
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <section className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-2xl border border-surface-border bg-white px-5 py-3 text-sm font-extrabold text-ink-muted transition hover:bg-primary-tint hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>

          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => handlePageChange(pageNumber)}
              className={[
                "flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-extrabold transition",
                currentPage === pageNumber
                  ? "bg-primary text-white shadow-soft"
                  : "border border-surface-border bg-white text-ink-muted hover:bg-primary-tint hover:text-primary",
              ].join(" ")}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-2xl border border-surface-border bg-white px-5 py-3 text-sm font-extrabold text-ink-muted transition hover:bg-primary-tint hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </section>
      ) : null}
    </section>
  );
};

const ActionButton = ({ icon, label, tone = "default", onClick }) => {
  const toneClass = {
    default:
      "border-surface-border bg-white text-ink hover:bg-primary-tint hover:text-primary",
    danger: "border-red-100 bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold transition",
        toneClass[tone],
      ].join(" ")}
    >
      <span className="material-symbols-rounded text-lg">{icon}</span>
      {label}
    </button>
  );
};

const StatusSelect = ({ currentStatus, onChange }) => {
  return (
    <select
      value={currentStatus}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-2xl border border-surface-border bg-white px-4 py-2 text-xs font-extrabold text-ink-muted outline-none transition focus:border-primary"
    >
      {DONATION_STATUS_OPTIONS.map((status) => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </select>
  );
};

export default AllBloodDonationRequests;