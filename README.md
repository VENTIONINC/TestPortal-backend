# test-results-manager


npx prisma init --datasource-provider sqlite
npx prisma migrate dev --name lowerCasedResultError

- Results TODO

Spec filters:
- filter by error message + group by error message like allure do
- filter mode: filter specs by 'has status' (hasFailed, hasSkipped, etc)

Global:
    Bulk actions:
        - button select all:
        - find a way to assign an issue to all selected
        - run auto review on all selected

Spec section:
    Bulk actions:
        - select all
        - button 'run auto review' to all selected
        - assign new issue to all selected
        - confirm/reject all selected
        - auto review on all selected

    View details:
        - click on error message to view stack
        - click on issue to view details (results?)


-----------
find buttons
select all
add to all
edit all
confirm all
reject all
